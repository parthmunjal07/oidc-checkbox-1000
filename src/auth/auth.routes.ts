import { Router } from 'express';
import { 
    renderSignupPage, 
    renderAuthenticatePage, 
    handleSignIn, 
    handleSignUp 
} from './auth.controller.js';

const router = Router();

router.get('/signup', renderSignupPage);
router.get('/authenticate', renderAuthenticatePage);

router.post('/register', handleSignUp);
router.post('/login', handleSignIn);

export default router;