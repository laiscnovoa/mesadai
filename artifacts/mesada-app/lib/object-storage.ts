import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import * as ImageManipulator from 'expo-image-manipulator';
import { API_BASE, getAuthToken } from '@/constants/api';

export async function prepareProofPhoto(localUri: string): Promise<string> {
  const normalized = await ImageManipulator.manipulateAsync(
    localUri,
    [],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  return normalized.uri;
}

// Uploads a locally-captured proof photo to cloud object storage and returns
// the public serving URL that any paired device can render. (expo_object_storage)
export async function uploadProofPhoto(localUri: string): Promise<string> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Sem autenticação para enviar a foto.');
  }

  const presignRes = await fetch(`${API_BASE}/objects/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!presignRes.ok) {
    throw new Error(`Falha ao preparar upload (${presignRes.status})`);
  }
  const { uploadURL, objectPath } = (await presignRes.json()) as {
    uploadURL: string;
    objectPath: string;
  };
  if (!uploadURL || !objectPath) {
    throw new Error('Resposta de upload inválida do servidor.');
  }

  const file = new File(localUri);
  const uploadRes = await fetch(uploadURL, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'image/jpeg' },
  });
  if (!uploadRes.ok) {
    throw new Error(`Falha no upload da foto (${uploadRes.status})`);
  }

  return `${API_BASE}${objectPath}`;
}
