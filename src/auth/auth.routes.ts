import { Router } from 'express';
import { 
    renderSignupPage, 
    renderAuthenticatePage, 
    handleSignIn, 
    handleSignUp,
    checkAuthStatus
} from './auth.controller.js';

const authRouter = Router();

authRouter.get('/signup', renderSignupPage);
authRouter.get('/authenticate', renderAuthenticatePage);

authRouter.post('/signup', handleSignUp);
authRouter.post('/login', handleSignIn);

authRouter.get('/status', checkAuthStatus);

export default authRouter;