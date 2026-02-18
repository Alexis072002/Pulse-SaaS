import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response, Request } from "express";

interface ErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? this.extractMessage(exception.getResponse())
      : "Une erreur interne est survenue.";

    const payload: ErrorPayload = {
      success: false,
      error: {
        code: this.codeFromStatus(statusCode),
        message,
        statusCode,
        timestamp: new Date().toISOString(),
        path: request.url
      }
    };

    response.status(statusCode).json(payload);
  }

  private extractMessage(response: string | object): string {
    if (typeof response === "string") {
      return response;
    }

    if (typeof response === "object" && response !== null && "message" in response) {
      const message = (response as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return message.join(", ");
      }
      return message ?? "Requête invalide.";
    }

    return "Requête invalide.";
  }

  private codeFromStatus(statusCode: number): string {
    const map: Record<number, string> = {
      400: "VALIDATION_ERROR",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      429: "RATE_LIMITED",
      500: "INTERNAL_ERROR",
      503: "INGESTION_FAILED"
    };

    return map[statusCode] ?? "INTERNAL_ERROR";
  }
}
