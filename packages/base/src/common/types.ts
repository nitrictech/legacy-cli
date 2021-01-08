
export interface NitricTemplate {
  name: string;
  lang: string;
  path: string;
}

export interface NitricTemplateRepository {
  name: string;
  templates: NitricTemplate[];
}

export interface NitricRepository {
  location: string;
}

export interface NitricRepositories {
  [name: string]: NitricRepository;
}