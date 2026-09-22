import type { Request } from 'express';

export const requestIp = (request: Request): string | null => request.ip ?? null;
