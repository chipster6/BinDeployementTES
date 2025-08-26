declare global {
  namespace Express {
    interface UserClaims {
      tenant_id?: string;
      roles?: string[];
      scope?: string;
    }
    interface Request {
      user?: UserClaims;
      tenant_id?: string;
      idemKey?: string;
      expectedEtag?: string;
    }
  }
}

export {};