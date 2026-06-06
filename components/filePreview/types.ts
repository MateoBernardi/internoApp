export type FileItem = {
  id: string;
  kind: 'image' | 'file';
  name: string;
  ext: string;
  size?: string;
  uri: string;
  sender?: string;
  date?: string;
  textPreview?: string;
};
