// Shared OTP store for user signup verification
// In production, replace this with Redis or a database table

interface OTPData {
    otp: string;
    expiresAt: Date;
    name: string;
}

class OTPStore {
    private store: Map<string, OTPData>;

    constructor() {
        this.store = new Map();
        
        // Cleanup expired OTPs every 5 minutes
        setInterval(() => {
            this.cleanup();
        }, 300000); // 5 minutes
    }

    set(key: string, data: OTPData): void {
        this.store.set(key, data);
        console.log(`📝 OTP Store SET - Key: ${key}, Size: ${this.store.size}, Keys: ${Array.from(this.store.keys()).join(', ')}`);
    }

    get(key: string): OTPData | undefined {
        const value = this.store.get(key);
        console.log(`📖 OTP Store GET - Key: ${key}, Found: ${!!value}, Size: ${this.store.size}, All Keys: ${Array.from(this.store.keys()).join(', ')}`);
        return value;
    }

    delete(key: string): boolean {
        return this.store.delete(key);
    }

    has(key: string): boolean {
        return this.store.has(key);
    }

    private cleanup(): void {
        const now = new Date();
        for (const [key, value] of this.store.entries()) {
            if (value.expiresAt < now) {
                this.store.delete(key);
                console.log(`🧹 Cleaned up expired OTP for ${key}`);
            }
        }
    }

    // For debugging
    size(): number {
        return this.store.size;
    }
}

// Create singleton instance
const otpStore = new OTPStore();

export default otpStore;
