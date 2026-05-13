import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dbService = {
  // Generic CRUD
  async add(collPath: string, data: any) {
    try {
      const docRef = await addDoc(collection(db, collPath), {
        ...data,
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collPath);
    }
  },

  async update(collPath: string, id: string, data: any) {
    try {
      const docRef = doc(db, collPath, id);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collPath}/${id}`);
    }
  },

  async delete(collPath: string, id: string) {
    try {
      const docRef = doc(db, collPath, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collPath}/${id}`);
    }
  },

  async getAll(collPath: string, ...queryConstraints: any[]) {
    try {
      const q = query(collection(db, collPath), ...queryConstraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collPath);
    }
  },

  subscribe(collPath: string, callback: (data: any[]) => void, ...queryConstraints: any[]) {
    const q = query(collection(db, collPath), ...queryConstraints);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, collPath);
    });
  }
};
