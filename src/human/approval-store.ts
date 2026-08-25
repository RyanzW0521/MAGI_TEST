import type { ApprovalRequest } from "../protocol/types.js";

export interface ApprovalStore {
  create(request: ApprovalRequest): Promise<ApprovalRequest>;
  get(id: string): Promise<ApprovalRequest | null>;
  update(request: ApprovalRequest): Promise<ApprovalRequest>;
}

export class InMemoryApprovalStore implements ApprovalStore {
  private readonly approvals = new Map<string, ApprovalRequest>();

  async create(request: ApprovalRequest): Promise<ApprovalRequest> {
    if (this.approvals.has(request.id)) throw new Error(`Approval already exists: ${request.id}`);
    this.approvals.set(request.id, structuredClone(request));
    return structuredClone(request);
  }

  async get(id: string): Promise<ApprovalRequest | null> {
    const request = this.approvals.get(id);
    return request ? structuredClone(request) : null;
  }

  async update(request: ApprovalRequest): Promise<ApprovalRequest> {
    if (!this.approvals.has(request.id)) throw new Error(`Approval does not exist: ${request.id}`);
    this.approvals.set(request.id, structuredClone(request));
    return structuredClone(request);
  }
}
