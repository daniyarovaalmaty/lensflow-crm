const UPLOAD_URL = 'https://mmundus.com/api/lensflow-upload/';
const UPLOAD_KEY = 'lf-upload-2026-medmundus-key';

/**
 * Upload a file to MedMundus media storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToMedMundus(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const resp = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'X-LF-Upload-Key': UPLOAD_KEY },
        body: formData,
    });

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `Upload failed: ${resp.status}`);
    }

    const data = await resp.json();
    return data.url;
}
