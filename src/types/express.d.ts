declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
                emailVerified: boolean;
                name?: string;
                picture?: string;
            };
        }
    }
}

export {};