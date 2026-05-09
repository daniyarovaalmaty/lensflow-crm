/**
 * Convert a File to a base64 data URL string.
 * Stores the image directly in the database — no external upload needed.
 */
export async function uploadToMedMundus(file: File): Promise<string> {
    // Resize/compress the image before base64 encoding to keep DB size small
    const compressed = await compressImage(file, 400, 0.75);
    return compressed;
}

/**
 * Compress an image and return as base64 data URL.
 */
function compressImage(file: File, maxDimension = 400, quality = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            // Scale down if needed
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}
