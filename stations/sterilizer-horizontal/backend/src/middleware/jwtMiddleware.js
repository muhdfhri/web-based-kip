import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jwt_change_me_in_production";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : (req.query?.token || req.cookies?.kip_token);

  // console.log(
  //   `[jwtDebug] Auth header present: ${!!authHeader}, token length: ${token ? token.length : 0}`,
  // );

  if (!token) {
    console.warn("[jwtDebug] No token found in request");
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // console.log(
    //   `[jwtDebug] Token verified OK: user=${decoded.username}, role=${decoded.userRole}`,
    // );
    req.user = decoded; // { userId, username, userRole, permissions }
    next();
  } catch (err) {
    console.error(`[jwtDebug] Token verification FAILED: ${err.message}`);
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid or expired token" });
  }
}

export function authorize(roles = []) {
  const allowed = (typeof roles === "string" ? [roles] : roles).map((r) =>
    r.toLowerCase(),
  );
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userRole = (req.user.userRole || "").toLowerCase();
    if (userRole === "developer") return next();
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: Insufficient role" });
    }
    next();
  };
}

export function authorizePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userRole = (req.user.userRole || "").toLowerCase();
    if (userRole === "developer") return next();
    const perms = req.user.permissions || [];
    if (!perms.includes(permission)) {
      return res
        .status(403)
        .json({ message: `Forbidden: Missing permission [${permission}]` });
    }
    next();
  };
}

export function authorizeRolesOrPermission(roles = [], permission = '') {
  const allowed = (typeof roles === "string" ? [roles] : roles).map((r) =>
    r.toLowerCase(),
  );
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userRole = (req.user.userRole || "").toLowerCase();
    
    if (userRole === "developer" || allowed.includes(userRole)) return next();
    
    const perms = req.user.permissions || [];
    console.log(`[AuthDebug] Checking permission '${permission}' for user ${req.user.username} (Role: ${userRole}). Has perms:`, perms.includes(permission), 'Total perms:', perms.length);
    
    if (permission && perms.includes(permission)) return next();
    
    return res.status(403).json({ message: "Forbidden: Insufficient role" });
  };
}
