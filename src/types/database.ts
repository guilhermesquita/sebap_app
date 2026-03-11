export type UserRole = 'ALUNO' | 'PROFESSOR' | 'ADMIN';
export type MateriaStatus = 'EM_PROGRESSO' | 'FINALIZADO' | 'EM_BREVE';

export interface Tenda {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  surname: string;
  cpf: string;
  phone: string | null;
  church_years: number | null;
  is_baptized: boolean;
  tenda_id: string | null;
  birth_date: string | null;
  sex: string | null;
  matricula: string;
  profile_image_url: string | null;
  role: UserRole[];
  created_at: string;
  updated_at: string;
}

export interface Materia {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: MateriaStatus;
  is_active: boolean;
  min_grade: number;
  max_grade: number;
  has_final_exam: boolean;
  final_exam_name?: string | null;
  final_exam_description?: string | null;
  banner_url?: string | null;
  description?: string | null;
  is_enrolled?: boolean;
  is_teaching?: boolean;
  current_grade?: number;
  is_approved?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MateriaProfessor {
  materia_id: string;
  professor_id: string;
}

export interface MateriaStudent {
  materia_id: string;
  aluno_id: string;
}

export interface Aula {
  id: string;
  materia_id: string;
  aula_number: number;
  date: string | null;
  tasks_count: number;
  tasks_max_grade: number;
  presence_max_grade: number;
  uploads: string[];
  links: string[];
  attendance_open: boolean;
  is_last_aula: boolean;
  created_at: string;
}

export interface AulaTask {
  id: string;
  aula_id: string;
  name: string;
  max_grade: number;
  created_at: string;
}

export interface StudentTaskGrade {
  id: string;
  task_id: string;
  aluno_id: string;
  grade: number;
  created_at: string;
}

export interface PresencaTarefa {
  id: string;
  aula_id: string;
  aluno_id: string;
  tasks_completed: boolean[];
  presence: boolean;
  presence_grade: number;
  created_at: string;
}

export interface NotaFinal {
  id: string;
  materia_id: string;
  aluno_id: string;
  final_exam_grade: number;
  total_grade: number;
  created_at: string;
}
