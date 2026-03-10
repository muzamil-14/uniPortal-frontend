'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  role: string;
  createdAt: string;
}

interface Department {
  id: number;
  name: string;
}

export default function AdminStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      Promise.all([apiFetch('/auth/users'), apiFetch('/departments')])
        .then(([users, depts]) => {
          setStudents(users);
          setDepartments(depts);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const handleDepartmentChange = async (studentId: number, department: string) => {
    try {
      const updated = await apiFetch(`/auth/users/${studentId}/department`, {
        method: 'PATCH',
        body: JSON.stringify({ department }),
      });
      setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
      toast.success('Department updated successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update department');
    }
  };

  const filtered = students.filter(
    (s) =>
      s.role === 'student' &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        (s.department || '').toLowerCase().includes(search.toLowerCase())),
  );

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Manage Students
        </h1>
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:border-transparent outline-none w-full sm:w-72"
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Department</th>
                <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Role</th>
                <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((student) => (
                <tr key={student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="p-4 font-medium text-zinc-900 dark:text-white">{student.name}</td>
                  <td className="p-4 text-zinc-500 dark:text-zinc-400">{student.email}</td>
                  <td className="p-4">
                    <select
                      value={student.department || ''}
                      onChange={(e) => handleDepartmentChange(student.id, e.target.value)}
                      className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm outline-none cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-zinc-500 dark:text-zinc-400">
                    {student.role.toLocaleUpperCase()}
                  </td>
                  <td className="p-4 text-zinc-500 dark:text-zinc-400">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">No students found.</div>
        )}
      </div>
    </div>
  );
}
