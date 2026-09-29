import { listModerationReports, listOwnReports, listPublicReports, addSupport, removeSupport } from '../repositories/report.repository.js';
import { createReport, getAttachmentForViewer, getReportForViewer, changeReportState } from '../services/report.service.js';
import { writeAudit } from '../repositories/audit.repository.js';

export async function listReportsController(request, response) {
  response.json(await listPublicReports(request.query, request.session?.user?.id));
}

export async function reportDetailController(request, response) {
  response.json({ report: await getReportForViewer(request.params.id, request.session?.user) });
}

export async function ownReportsController(request, response) {
  response.json(await listOwnReports(request.session.user.id, request.query));
}

export async function createReportController(request, response) {
  const report = await createReport({ data: request.body, files: request.files, userId: request.session.user.id, ip: request.ip });
  response.status(201).json({ report });
}

export async function supportController(request, response) {
  await addSupport(request.params.id, request.session.user.id);
  await writeAudit({ userId: request.session.user.id, action: 'SOSTEGNO_AGGIUNTO', entity: 'segnalazione', entityId: request.params.id, ip: request.ip });
  response.status(204).end();
}

export async function unsupportController(request, response) {
  await removeSupport(request.params.id, request.session.user.id);
  await writeAudit({ userId: request.session.user.id, action: 'SOSTEGNO_RIMOSSO', entity: 'segnalazione', entityId: request.params.id, ip: request.ip });
  response.status(204).end();
}

export async function attachmentController(request, response) {
  const attachment = await getAttachmentForViewer(request.params.id, request.session?.user);
  response.type(attachment.mimeType).set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);
  response.sendFile(attachment.filePath);
}

export async function moderationListController(request, response) {
  response.json(await listModerationReports(request.query));
}

export async function stateChangeController(request, response) {
  const report = await changeReportState({
    reportId: request.params.id,
    stateId: request.body.stateId,
    reason: request.body.reason,
    operatorId: request.session.user.id,
    ip: request.ip
  });
  response.json({ report });
}
