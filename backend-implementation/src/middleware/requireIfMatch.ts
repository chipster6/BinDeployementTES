import { HDR } from "@/types/headers";
import { precondition } from "@/shared/ResponseHelper";

export function requireIfMatch() {
  return (req: any, res: any, next: any) => {
    const etag = req.header(HDR.IF_MATCH);
    if (!etag) return precondition(res, "Missing If-Match ETag");
    req.expectedEtag = etag;
    return next();
  };
}