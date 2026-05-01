import { Router } from 'express';
import { 
    renderSignupPage, 
    renderAuthenticatePage, 
    handleSignIn, 
    handleSignUp 
} from './auth.controller.js';

const authRouter = Router();

authRouter.get('/signup', renderSignupPage);
authRouter.get('/authenticate', renderAuthenticatePage);

authRouter.post('/register', handleSignUp);
authRouter.post('/login', handleSignIn);

export default authRouter;