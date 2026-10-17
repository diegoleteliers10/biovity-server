import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  ContactInquiryQueryDto,
  ContactInquiryStatus,
  UpdateContactInquiryDto,
} from '../../interfaces/dtos/admin/contact-inquiries.dto';

type InquiryRow = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  empresa: string;
  mensaje: string;
  is_read: boolean;
  created_at: Date;
  status: ContactInquiryStatus;
  assigned_admin_id: string | null;
  assignee_name: string | null;
  follow_up_at: string | null;
  resolution_note: string | null;
  resolved_at: Date | null;
  resolved_by_id: string | null;
  updated_at: Date;
};

type InquiryValues = {
  status: ContactInquiryStatus;
  assignedAdminId: string | null;
  followUpAt: string | null;
  resolutionNote: string | null;
};

const inquirySelect = `
  SELECT m.id, m.nombre, m.apellido, m.email, m.telefono, m.empresa,
    m.mensaje, m.is_read, m.created_at, m.status, m.assigned_admin_id,
    u.name AS assignee_name, m.follow_up_at, m.resolution_note,
    m.resolved_at, m.resolved_by_id, m.updated_at
  FROM contact_messages m
  LEFT JOIN "user" u ON u.id = m.assigned_admin_id`;

function mapInquiry(row: InquiryRow) {
  return {
    id: Number(row.id),
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email,
    telefono: row.telefono,
    empresa: row.empresa,
    mensaje: row.mensaje,
    isRead: row.is_read,
    createdAt: row.created_at,
    status: row.status,
    assignedAdminId: row.assigned_admin_id,
    assigneeName: row.assignee_name,
    followUpAt: row.follow_up_at,
    resolutionNote: row.resolution_note,
    resolvedAt: row.resolved_at,
    updatedAt: row.updated_at,
  };
}

function valuesFrom(row: InquiryRow): InquiryValues {
  return {
    status: row.status,
    assignedAdminId: row.assigned_admin_id,
    followUpAt: row.follow_up_at,
    resolutionNote: row.resolution_note,
  };
}

function hasChanges(before: InquiryValues, after: InquiryValues): boolean {
  return (
    before.status !== after.status ||
    before.assignedAdminId !== after.assignedAdminId ||
    before.followUpAt !== after.followUpAt ||
    before.resolutionNote !== after.resolutionNote
  );
}

@Injectable()
export class AdminContactInquiriesService {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: ContactInquiryQueryDto) {
    const clauses: string[] = ['TRUE'];
    const parameters: unknown[] = [];
    const addParameter = (value: unknown): string => {
      parameters.push(value);
      return `$${parameters.length}`;
    };

    if (query.search?.trim()) {
      const search = addParameter(`%${query.search.trim()}%`);
      clauses.push(
        `(m.email ILIKE ${search} OR m.nombre ILIKE ${search} OR m.apellido ILIKE ${search} OR m.empresa ILIKE ${search})`,
      );
    }
    if (query.status) clauses.push(`m.status = ${addParameter(query.status)}`);
    if (query.assigneeId) {
      clauses.push(`m.assigned_admin_id = ${addParameter(query.assigneeId)}`);
    }
    if (query.unassigned === true) {
      clauses.push('m.assigned_admin_id IS NULL');
    } else if (query.unassigned === false) {
      clauses.push('m.assigned_admin_id IS NOT NULL');
    }
    if (query.overdue === true) {
      clauses.push(`m.follow_up_at < CURRENT_DATE AND m.status <> 'resolved'`);
    } else if (query.overdue === false) {
      clauses.push(
        `(m.follow_up_at IS NULL OR m.follow_up_at >= CURRENT_DATE OR m.status = 'resolved')`,
      );
    }

    const where = clauses.join(' AND ');
    const filterParameters = [...parameters];
    const countRows = await this.dataSource.query<{ total: string }[]>(
      `SELECT COUNT(*)::text AS total FROM contact_messages m WHERE ${where}`,
      filterParameters,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const limitParam = addParameter(limit);
    const offsetParam = addParameter((page - 1) * limit);
    const rows = await this.dataSource.query<InquiryRow[]>(
      `${inquirySelect} WHERE ${where} ORDER BY m.created_at DESC, m.id DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
      parameters,
    );

    return {
      data: rows.map(mapInquiry),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listOperators() {
    const rows = await this.dataSource.query<
      { id: string; name: string; email: string }[]
    >(
      `SELECT id, name, email FROM "user" WHERE type = 'admin' AND "isActive" = true ORDER BY name ASC`,
    );
    return { data: rows };
  }

  async update(id: number, actorId: string, input: UpdateContactInquiryDto) {
    return this.dataSource.transaction(async manager => {
      const rows = await manager.query<InquiryRow[]>(
        `${inquirySelect} WHERE m.id = $1 FOR UPDATE OF m`,
        [id],
      );
      const row = rows[0];
      if (!row)
        return Promise.reject(new NotFoundException('Inquiry not found'));

      const before = valuesFrom(row);
      const after: InquiryValues = {
        status: input.status ?? before.status,
        assignedAdminId:
          input.assignedAdminId === undefined
            ? before.assignedAdminId
            : input.assignedAdminId,
        followUpAt:
          input.followUpAt === undefined ? before.followUpAt : input.followUpAt,
        resolutionNote:
          input.resolutionNote === undefined
            ? before.resolutionNote
            : input.resolutionNote?.trim() || null,
      };

      if (input.assignedAdminId !== undefined && after.assignedAdminId) {
        await this.assertActiveAdmin(manager, after.assignedAdminId);
      }
      if (
        after.status === 'resolved' &&
        before.status !== 'resolved' &&
        !after.resolutionNote
      ) {
        return Promise.reject(
          new BadRequestException(
            'A resolution note is required to resolve an inquiry',
          ),
        );
      }

      if (hasChanges(before, after)) {
        const newlyResolved =
          after.status === 'resolved' && before.status !== 'resolved';
        const remainsResolved =
          after.status === 'resolved' && before.status === 'resolved';
        const resolvedAt = newlyResolved
          ? new Date()
          : remainsResolved
            ? row.resolved_at
            : null;
        const resolvedById = newlyResolved
          ? actorId
          : remainsResolved
            ? row.resolved_by_id
            : null;
        const updatedRows = await manager.query<InquiryRow[]>(
          `UPDATE contact_messages SET status = $2, assigned_admin_id = $3,
             follow_up_at = $4, resolution_note = $5, resolved_at = $6,
             resolved_by_id = $7, updated_at = NOW()
           WHERE id = $1
           RETURNING id, nombre, apellido, email, telefono, empresa, mensaje,
             is_read, created_at, status, assigned_admin_id, follow_up_at,
             resolution_note, resolved_at, resolved_by_id, updated_at`,
          [
            id,
            after.status,
            after.assignedAdminId,
            after.followUpAt,
            after.resolutionNote,
            resolvedAt,
            resolvedById,
          ],
        );
        await manager.query(
          `INSERT INTO contact_message_events
             (message_id, actor_user_id, event_type, previous_status, new_status,
              previous_assigned_admin_id, new_assigned_admin_id,
              previous_follow_up_at, new_follow_up_at, note)
           VALUES ($1, $2, 'updated', $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            actorId,
            before.status,
            after.status,
            before.assignedAdminId,
            after.assignedAdminId,
            before.followUpAt,
            after.followUpAt,
            after.resolutionNote,
          ],
        );
        const updated = updatedRows[0];
        const assigneeRows = updated.assigned_admin_id
          ? await manager.query<{ name: string | null }[]>(
              `SELECT name FROM "user" WHERE id = $1`,
              [updated.assigned_admin_id],
            )
          : [];
        return mapInquiry({
          ...updated,
          assignee_name: assigneeRows[0]?.name ?? null,
        });
      }

      return mapInquiry(row);
    });
  }

  async events(id: number) {
    const messageRows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM contact_messages WHERE id = $1`,
      [id],
    );
    if (!messageRows[0])
      return Promise.reject(new NotFoundException('Inquiry not found'));

    const rows = await this.dataSource.query<
      {
        id: string;
        actor_user_id: string | null;
        actor_name: string | null;
        event_type: string;
        previous_status: ContactInquiryStatus | null;
        new_status: ContactInquiryStatus | null;
        previous_assigned_admin_id: string | null;
        new_assigned_admin_id: string | null;
        previous_follow_up_at: string | null;
        new_follow_up_at: string | null;
        note: string | null;
        created_at: Date;
      }[]
    >(
      `SELECT e.id, e.actor_user_id, u.name AS actor_name, e.event_type,
         e.previous_status, e.new_status, e.previous_assigned_admin_id,
         e.new_assigned_admin_id, e.previous_follow_up_at, e.new_follow_up_at,
         e.note, e.created_at
       FROM contact_message_events e
       LEFT JOIN "user" u ON u.id = e.actor_user_id
       WHERE e.message_id = $1 ORDER BY e.created_at DESC, e.id DESC`,
      [id],
    );
    return {
      data: rows.map(row => ({
        id: Number(row.id),
        actorUserId: row.actor_user_id,
        actorName: row.actor_name,
        eventType: row.event_type,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        previousAssignedAdminId: row.previous_assigned_admin_id,
        newAssignedAdminId: row.new_assigned_admin_id,
        previousFollowUpAt: row.previous_follow_up_at,
        newFollowUpAt: row.new_follow_up_at,
        note: row.note,
        createdAt: row.created_at,
      })),
    };
  }

  private async assertActiveAdmin(manager: EntityManager, id: string) {
    const rows = await manager.query<{ id: string }[]>(
      `SELECT id FROM "user" WHERE id = $1 AND type = 'admin' AND "isActive" = true`,
      [id],
    );
    if (!rows[0]) {
      return Promise.reject(
        new BadRequestException('Assignee must be an active admin'),
      );
    }
  }
}
