// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface TargetService {
            host: string,
            port: number,
        }
        
        interface Security {
            identityProviderHost: string,
            tokenEndpoint: string,
            clientId: string,
            clientSecret: string
        }
        
        interface AdapterConfig {
            option1: boolean;
            option2: string;
            targetService: TargetService;
            security: Security;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
