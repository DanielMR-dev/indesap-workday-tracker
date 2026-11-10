export interface Employee {
  id: number;
  code: string;
  name: string;
}

export interface Session {
  id: number;
  startedAt: string;
  endedAt: string | null;
  workedSeconds: number | null;
}

export interface SessionResponse extends Session {
  employee: Employee;
}

export interface ActiveSessionResponse {
  employee: Employee;
  session: Session | null;
}
