import { db } from '@/lib/db';
import { usersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export class UserService {
  static async createOrUpdateUser(firebaseUser: any, provider: string) {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByUid(firebaseUser.uid);
      
      if (existingUser) {
        // Update existing user
        const [updatedUser] = await db
          .update(usersTable)
          .set({
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            provider,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.uid, firebaseUser.uid))
          .returning();
        
        return updatedUser;
      } else {
        // Create new user
        const [newUser] = await db
          .insert(usersTable)
          .values({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            provider,
            requestsUsed: 0,
            requestsLimit: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        
        return newUser;
      }
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw new Error('Failed to create or update user');
    }
  }

  static async getUserByUid(uid: string) {
    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.uid, uid))
        .limit(1);
      
      return user || null;
    } catch (error) {
      console.error('Error fetching user by uid:', error);
      throw new Error('Failed to fetch user');
    }
  }

  static async incrementUserRequests(uid: string) {
    try {
      const [updatedUser] = await db
        .update(usersTable)
        .set({
          requestsUsed: sql`${usersTable.requestsUsed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.uid, uid))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error('Error incrementing user requests:', error);
      throw new Error('Failed to increment user requests');
    }
  }
}
