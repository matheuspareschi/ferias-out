/**
 * A lib.dom.d.ts deste projeto tem os tipos base da File System Access API
 * (handles, streams) mas não o picker nem os métodos de permissão — essas
 * partes foram adicionadas depois na spec. Só o que falta, declarado aqui.
 */
export {}

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite'
  }

  interface FileSystemFileHandle {
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  }

  interface OpenFilePickerOptions {
    types?: { description?: string; accept: Record<string, string[]> }[]
    excludeAcceptAllOption?: boolean
    multiple?: boolean
  }

  interface Window {
    showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>
  }
}
