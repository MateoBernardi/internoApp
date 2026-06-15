import React from 'react';
import { Modal } from 'react-native';
import { FileViewer } from './FileViewer';
import { ImageViewer } from './ImageViewer';
import type { FileItem } from './types';

interface Props {
  file: FileItem | null;
  onClose: () => void;
}

export function FilePreview({ file, onClose }: Props) {
  return (
    <Modal
      visible={file !== null}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {file !== null && (
        file.kind === 'image'
          ? <ImageViewer file={file} onClose={onClose} />
          : <FileViewer file={file} onClose={onClose} />
      )}
    </Modal>
  );
}
