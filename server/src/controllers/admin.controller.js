import {
  createCategory, createNeighborhood, deleteCategory, deleteNeighborhood,
  updateCategory, updateNeighborhood
} from '../repositories/meta.repository.js';
import { listUsers, updateUserAdmin } from '../repositories/user.repository.js';
import { writeAudit } from '../repositories/audit.repository.js';
import { HttpError } from '../utils/http-error.js';

export async function listUsersController(request, response) {
  response.json(await listUsers(request.validatedQuery));
}

export async function updateUserController(request, response) {
  if (Number(request.params.id) === request.session.user.id && request.body.accountStatus && request.body.accountStatus !== 'ATTIVO') {
    throw new HttpError(409, 'Non puoi disattivare il tuo account amministratore durante la sessione.', 'SELF_DISABLE');
  }
  const user = await updateUserAdmin(request.params.id, request.body);
  if (!user) throw new HttpError(404, 'Utente non trovato.', 'USER_NOT_FOUND');
  await writeAudit({ userId: request.session.user.id, action: 'UTENTE_MODIFICATO', entity: 'utente', entityId: request.params.id,
    details: request.body, ip: request.ip });
  response.json({ user });
}

export async function createNeighborhoodController(request, response) {
  const item = await createNeighborhood(request.body);
  await writeAudit({ userId: request.session.user.id, action: 'QUARTIERE_CREATO', entity: 'quartiere', entityId: item.id, ip: request.ip });
  response.status(201).json({ neighborhood: item });
}

export async function updateNeighborhoodController(request, response) {
  const affected = await updateNeighborhood(request.params.id, request.body);
  if (!affected) throw new HttpError(404, 'Quartiere non trovato.', 'NEIGHBORHOOD_NOT_FOUND');
  response.status(204).end();
}

export async function deleteNeighborhoodController(request, response) {
  const affected = await deleteNeighborhood(request.params.id);
  if (!affected) throw new HttpError(404, 'Quartiere non trovato.', 'NEIGHBORHOOD_NOT_FOUND');
  response.status(204).end();
}

export async function createCategoryController(request, response) {
  const item = await createCategory(request.body);
  await writeAudit({ userId: request.session.user.id, action: 'CATEGORIA_CREATA', entity: 'categoria', entityId: item.id, ip: request.ip });
  response.status(201).json({ category: item });
}

export async function updateCategoryController(request, response) {
  const affected = await updateCategory(request.params.id, request.body);
  if (!affected) throw new HttpError(404, 'Categoria non trovata.', 'CATEGORY_NOT_FOUND');
  response.status(204).end();
}

export async function deleteCategoryController(request, response) {
  const affected = await deleteCategory(request.params.id);
  if (!affected) throw new HttpError(404, 'Categoria non trovata.', 'CATEGORY_NOT_FOUND');
  response.status(204).end();
}
