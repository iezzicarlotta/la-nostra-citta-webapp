import { listCategories, listNeighborhoods, listStatuses } from '../repositories/meta.repository.js';

export async function metaController(_request, response) {
  const [neighborhoods, categories, statuses] = await Promise.all([
    listNeighborhoods(), listCategories(), listStatuses()
  ]);
  response.json({ neighborhoods, categories, statuses });
}
