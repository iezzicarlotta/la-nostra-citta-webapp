import { searchAddress } from '../services/geocoding.service.js';

export async function searchAddressController(request, response) {
  response.json({ results: await searchAddress(request.body.address) });
}