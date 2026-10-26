function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Saves the file to the app's cache and opens Android's share menu (save to Files, email, WhatsApp…).
 * In a desktop browser it downloads the file instead. Cancelling the share menu is not an error.
 */
export async function shareFile(filename: string, contents: string | Uint8Array, mimeType: string, dialogTitle = 'Share report', text?: string): Promise<void> {
  await shareFiles([{ filename, contents }], mimeType, dialogTitle, text);
}

/**
 * Like `shareFile`, for several files of one type at once, e.g. a Wrap's images to post as a story. `text` goes
 * along as a caption where the receiving app takes one (WhatsApp does; Instagram ignores it).
 */
export async function shareFiles(files: { filename: string; contents: string | Uint8Array }[], mimeType: string, dialogTitle: string, text?: string): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) {
    for (const { filename, contents } of files) {
      const blob = new Blob([contents as BlobPart], { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }
    return;
  }

  const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const uris: string[] = [];
  for (const { filename, contents } of files) {
    const written =
      typeof contents === 'string'
        ? await Filesystem.writeFile({ path: filename, data: contents, directory: Directory.Cache, encoding: Encoding.UTF8 })
        : await Filesystem.writeFile({ path: filename, data: toBase64(contents), directory: Directory.Cache });
    uris.push(written.uri);
  }
  try {
    await Share.share({ title: files[0]?.filename, text, files: uris, dialogTitle });
  } catch (error) {
    if (!/cancel/i.test(String((error as Error)?.message ?? error))) throw error;
  }
}
