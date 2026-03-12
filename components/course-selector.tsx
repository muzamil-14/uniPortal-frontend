'use client';

interface Course {
  id: number;
  title: string;
  description?: string;
  creditHours?: number;
  instructor?: string;
}

interface CourseSelectorProps {
  courses: Course[];
  selectedCourse: number | '';
  onSelect: (courseId: number | '') => void;
  label?: string;
  subtitle?: string;
}

const courseColors = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-blue-500',
  'from-fuchsia-500 to-purple-500',
];

export default function CourseSelector({ courses, selectedCourse, onSelect, label = 'Your Courses', subtitle }: CourseSelectorProps) {
  const selectedCourseData = courses.find((c) => c.id === selectedCourse);

  if (selectedCourse && selectedCourseData) {
    return (
      <button
        onClick={() => onSelect('')}
        className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-accent dark:hover:text-accent transition-colors cursor-pointer group"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5"><polyline points="15 18 9 12 15 6" /></svg>
        <span>Back to all courses</span>
        <span className="text-zinc-300 dark:text-zinc-600 mx-1">|</span>
        <span className="font-medium text-zinc-900 dark:text-white">{selectedCourseData.title}</span>
      </button>
    );
  }

  return (
    <div>
      {label && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{label}</h2>
          {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {courses.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400 text-center py-12">No courses found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map((c, i) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="flex items-center gap-4 w-full text-left bg-card-bg border border-card-border rounded-xl overflow-hidden hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 group cursor-pointer"
            >
              <div className={`w-1.5 self-stretch bg-gradient-to-b ${courseColors[i % courseColors.length]} shrink-0 rounded-l-xl`} />
              <div className="flex items-center gap-4 flex-1 py-4 pr-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${courseColors[i % courseColors.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {c.title.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold group-hover:text-accent transition-colors truncate">{c.title}</h3>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                    {c.creditHours && <span>{c.creditHours} Credits</span>}
                    {c.instructor && <span>By {c.instructor}</span>}
                    {c.description && <span className="truncate hidden sm:inline">{c.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <span>Open</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
