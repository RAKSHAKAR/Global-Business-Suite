import { validateFileUpload } from "../../utils/securityUtils";
import { eventBus } from "../eventBus";

export class MediaServiceModule {
  public async processUpload(params: {
    tenantId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }) {
    const validation = validateFileUpload(params.fileName, params.mimeType);
    if (!validation.valid) {
      throw new Error(validation.reason || "Invalid file payload.");
    }

    const fileRecord = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      tenantId: params.tenantId,
      originalName: params.fileName,
      storedName: validation.safeName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      url: `/uploads/${params.tenantId}/${validation.safeName}`,
      uploadedAt: new Date().toISOString(),
    };

    eventBus.publish("media:uploaded", fileRecord, { tenantId: params.tenantId });

    return fileRecord;
  }
}

export const mediaServiceModule = new MediaServiceModule();
