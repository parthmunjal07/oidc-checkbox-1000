import path from "node:path"
import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from 'bcrypt'
import type { JWTClaims } from "../utils/jwt.js";
import jwt from 'jsonwebtoken' 
import { PRIVATE_KEY } from "../utils/cert.js";

export const renderSignupPage = (req: Request, res: Response) => {
  res.sendFile(path.resolve('./public/signup.html')); 
};

export const renderAuthenticatePage = (req: Request, res: Response) => {
    res.sendFile(path.resolve('./public/authenticate.html')); 
};

export const handleSignIn = async (req: Request, res: Response) => {
    
    const {email, password} = req.body
    if (!email || !password) {
        return res.status(404).json({message : "Not found"})
    }
    
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1)
    
    if (!user || !user.password || !user.salt) {
        return res.status(401).json({ message: "Invalid email or password." });
    }

    const passCheck = await bcrypt.compare(password, user.password)

    if (!passCheck) { 
        return res.status(401).json({message : "Incorrect Password"})
    }

    const ISSUER = `http://localhost:${process.env.PORT || 3000}`;
    const now = Math.floor(Date.now() / 1000);

    const claims: JWTClaims = {
        iss: ISSUER,
        sub: user.id,
        email: user.email,
        email_verified: Boolean(user.emailVerified),
        exp: now + 3600,
        name: user.name ?? "",
        picture: user.profileImageURL ?? "",
  };

  const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });
  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict`);

  return res.json({ token });
}

export const handleSignUp = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

  if (!email || !password || !name) {
    res
      .status(400)
      .json({ message: " name, email, and password are required." });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    res
      .status(409)
      .json({ message: "An account with this email already exists." });
    return;
  }

    const salt = await bcrypt.genSalt(10);
    const passwdHash = await bcrypt.hash(password, salt)

  await db.insert(usersTable).values({
    name: name,
    email,
    password: passwdHash,
    salt,
  });

  res.status(201).json({ ok: true });
}

export const checkAuthStatus = async (req: Request, res: Response) => {
    try {
        const cookieHeader = req.headers.cookie;
        let token = null;
        
        if (cookieHeader) {
            const match = cookieHeader.match(new RegExp('(^| )token=([^;]+)'));
            if (match) token = match[2];
        }

        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }

        jwt.verify(token, PRIVATE_KEY); 

        return res.status(200).json({ authenticated: true });
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
};