export const kb = (size: number) => size * 1024;
export const mb = (size: number) => kb(size) * 1024;

export const FILE_CHUNK_SIZE = kb(64);

export const fileChunk = (
  file: File,
  chunkSize = FILE_CHUNK_SIZE
): Iterable<{ chunk: Promise<ArrayBuffer>; index: number }> => {
  const fileSize = file.size;
  const chunkCount = Math.ceil(fileSize / chunkSize);

  return {
    [Symbol.iterator]: function* () {
      for (let i = 0; i < chunkCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileSize);
        yield {
          chunk: file.slice(start, end).arrayBuffer(),
          index: i,
        };
      }
    },
  };
};
