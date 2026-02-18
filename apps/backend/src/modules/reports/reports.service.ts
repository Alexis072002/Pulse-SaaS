import { Injectable } from "@nestjs/common";

@Injectable()
export class ReportsService {
  async listReports(userId: string): Promise<Array<{ id: string; userId: string; status: string }>> {
    return [
      {
        id: "pending-report",
        userId,
        status: "PENDING"
      }
    ];
  }
}
