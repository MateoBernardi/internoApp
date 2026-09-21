export type FileItem = {
  id: string;
  kind: 'image' | 'video' | 'file';
  name: string;
  ext: string;
  size?: string;
  uri: string;
  sender?: string;
  date?: string;
  textPreview?: string;
};
