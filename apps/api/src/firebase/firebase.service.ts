import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    if (!projectId) {
      this.logger.warn(
        'FIREBASE_PROJECT_ID not set — Firebase Auth verification disabled (dev JWT only)',
      );
      return;
    }
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId,
          credential: admin.credential.applicationDefault(),
          storageBucket: this.config.get<string>('FIREBASE_STORAGE_BUCKET'),
        });
      }
      this.ready = true;
      this.logger.log('Firebase Admin initialized');
    } catch (err) {
      this.logger.warn(
        `Firebase Admin init failed (continuing with JWT): ${String(err)}`,
      );
    }
  }

  isReady() {
    return this.ready;
  }

  async verifyIdToken(token: string) {
    if (!this.ready) return null;
    return admin.auth().verifyIdToken(token);
  }

  /** Stub for future invoice PDF uploads */
  getStorageBucket(): { name: string } | null {
    if (!this.ready) return null;
    const bucket = admin.storage().bucket();
    return { name: bucket.name };
  }

  /** Stub for FCM low-stock push */
  async sendPushStub(token: string, title: string, body: string) {
    if (!this.ready) {
      this.logger.debug(`FCM stub skip: ${title} — ${body}`);
      return { skipped: true };
    }
    return admin.messaging().send({
      token,
      notification: { title, body },
    });
  }
}
