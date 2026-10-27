import type { WorkDefinition } from './types';

/**
 * Central Game-Engine-Style Registry for Audiovisual Works / Scenes.
 */
export class WorkRegistry {
  private works = new Map<string, WorkDefinition>();
  private defaultWorkId: string | null = null;

  register(work: WorkDefinition, isDefault = false): void {
    this.works.set(work.id, work);
    if (isDefault || !this.defaultWorkId) {
      this.defaultWorkId = work.id;
    }
  }

  get(id: string): WorkDefinition | undefined {
    return this.works.get(id);
  }

  getDefault(): WorkDefinition {
    if (!this.defaultWorkId) {
      throw new Error('No works registered in WorkRegistry');
    }
    return this.works.get(this.defaultWorkId)!;
  }

  list(): WorkDefinition[] {
    return Array.from(this.works.values());
  }
}
