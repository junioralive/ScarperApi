import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { usersTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function getUserByUid(uid: string) {
  if (!uid) {
    throw new Error('UID is required')
  }

  try {
    console.log('Fetching user by uid:', uid)
    const users = await db
      .select({
        id: usersTable.id,
        uid: usersTable.uid,
        email: usersTable.email,
        displayName: usersTable.displayName,
        photoURL: usersTable.photoURL,
        requestsUsed: usersTable.requestsUsed,
        requestsLimit: usersTable.requestsLimit,
        createdAt: usersTable.createdAt,
        lastLoginAt: usersTable.lastLoginAt,
      })
      .from(usersTable)
      .where(eq(usersTable.uid, uid))
      .limit(1)

    return users[0] || null
  } catch (error) {
    console.error('Error fetching user by uid:', error)
    throw error
  }
}

async function createOrUpdateUser(userData: {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
}) {
  if (!userData.uid || !userData.email) {
    throw new Error('UID and email are required')
  }

  try {
    console.log('Creating/updating user:', userData)

    const existingUser = await getUserByUid(userData.uid)

    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(usersTable)
        .set({
          email: userData.email,
          displayName: userData.displayName || existingUser.displayName,
          photoURL: userData.photoURL || existingUser.photoURL,
          lastLoginAt: new Date(),
        })
        .where(eq(usersTable.uid, userData.uid))
        .returning({
          id: usersTable.id,
          uid: usersTable.uid,
          email: usersTable.email,
          displayName: usersTable.displayName,
          photoURL: usersTable.photoURL,
          requestsUsed: usersTable.requestsUsed,
          requestsLimit: usersTable.requestsLimit,
          createdAt: usersTable.createdAt,
          lastLoginAt: usersTable.lastLoginAt,
        })

      return updatedUser
    } else {
      // Create new user
      const [newUser] = await db
        .insert(usersTable)
        .values({
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName || null,
          photoURL: userData.photoURL || null,
          requestsUsed: 0,
          requestsLimit: 1000,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        })
        .returning({
          id: usersTable.id,
          uid: usersTable.uid,
          email: usersTable.email,
          displayName: usersTable.displayName,
          photoURL: usersTable.photoURL,
          requestsUsed: usersTable.requestsUsed,
          requestsLimit: usersTable.requestsLimit,
          createdAt: usersTable.createdAt,
          lastLoginAt: usersTable.lastLoginAt,
        })

      return newUser
    }
  } catch (error) {
    console.error('Error creating/updating user:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    const user = await createOrUpdateUser({
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      provider: userData.provider || 'google',
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
