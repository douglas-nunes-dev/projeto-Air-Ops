export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      clientes: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          contato_nome: string | null;
          criado_em: string;
          documento: string | null;
          email: string | null;
          id: string;
          nome: string;
          observacoes: string | null;
          organizacao_id: string;
          telefone: string | null;
          tipo_pessoa: Database['public']['Enums']['tipo_pessoa'];
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          contato_nome?: string | null;
          criado_em?: string;
          documento?: string | null;
          email?: string | null;
          id?: string;
          nome: string;
          observacoes?: string | null;
          organizacao_id: string;
          telefone?: string | null;
          tipo_pessoa?: Database['public']['Enums']['tipo_pessoa'];
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          contato_nome?: string | null;
          criado_em?: string;
          documento?: string | null;
          email?: string | null;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          organizacao_id?: string;
          telefone?: string | null;
          tipo_pessoa?: Database['public']['Enums']['tipo_pessoa'];
        };
        Relationships: [
          {
            foreignKeyName: 'clientes_organizacao_id_fkey';
            columns: ['organizacao_id'];
            isOneToOne: false;
            referencedRelation: 'organizacoes';
            referencedColumns: ['id'];
          },
        ];
      };
      equipamentos: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          capacidade_btu: number | null;
          criado_em: string;
          data_instalacao: string | null;
          id: string;
          identificacao: string;
          local_id: string;
          marca: string | null;
          modelo: string | null;
          numero_serie: string | null;
          observacoes: string | null;
          organizacao_id: string;
          patrimonio: string | null;
          periodicidade_dias: number | null;
          proxima_manutencao: string | null;
          tipo: Database['public']['Enums']['tipo_equipamento'];
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          capacidade_btu?: number | null;
          criado_em?: string;
          data_instalacao?: string | null;
          id?: string;
          identificacao: string;
          local_id: string;
          marca?: string | null;
          modelo?: string | null;
          numero_serie?: string | null;
          observacoes?: string | null;
          organizacao_id: string;
          patrimonio?: string | null;
          periodicidade_dias?: number | null;
          proxima_manutencao?: string | null;
          tipo: Database['public']['Enums']['tipo_equipamento'];
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          capacidade_btu?: number | null;
          criado_em?: string;
          data_instalacao?: string | null;
          id?: string;
          identificacao?: string;
          local_id?: string;
          marca?: string | null;
          modelo?: string | null;
          numero_serie?: string | null;
          observacoes?: string | null;
          organizacao_id?: string;
          patrimonio?: string | null;
          periodicidade_dias?: number | null;
          proxima_manutencao?: string | null;
          tipo?: Database['public']['Enums']['tipo_equipamento'];
        };
        Relationships: [
          {
            foreignKeyName: 'equipamentos_local_id_organizacao_id_fkey';
            columns: ['local_id', 'organizacao_id'];
            isOneToOne: false;
            referencedRelation: 'locais_atendimento';
            referencedColumns: ['id', 'organizacao_id'];
          },
        ];
      };
      locais_atendimento: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          bairro: string | null;
          cep: string | null;
          cidade: string | null;
          cliente_id: string;
          complemento: string | null;
          criado_em: string;
          id: string;
          logradouro: string | null;
          nome: string;
          numero: string | null;
          observacoes: string | null;
          organizacao_id: string;
          uf: string | null;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          bairro?: string | null;
          cep?: string | null;
          cidade?: string | null;
          cliente_id: string;
          complemento?: string | null;
          criado_em?: string;
          id?: string;
          logradouro?: string | null;
          nome: string;
          numero?: string | null;
          observacoes?: string | null;
          organizacao_id: string;
          uf?: string | null;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          bairro?: string | null;
          cep?: string | null;
          cidade?: string | null;
          cliente_id?: string;
          complemento?: string | null;
          criado_em?: string;
          id?: string;
          logradouro?: string | null;
          nome?: string;
          numero?: string | null;
          observacoes?: string | null;
          organizacao_id?: string;
          uf?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'locais_atendimento_cliente_id_organizacao_id_fkey';
            columns: ['cliente_id', 'organizacao_id'];
            isOneToOne: false;
            referencedRelation: 'clientes';
            referencedColumns: ['id', 'organizacao_id'];
          },
        ];
      };
      ordem_servico_equipamentos: {
        Row: {
          criado_em: string;
          equipamento_id: string;
          ordem_id: string;
          organizacao_id: string;
        };
        Insert: {
          criado_em?: string;
          equipamento_id: string;
          ordem_id: string;
          organizacao_id: string;
        };
        Update: {
          criado_em?: string;
          equipamento_id?: string;
          ordem_id?: string;
          organizacao_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ordem_servico_equipamentos_equipamento_id_organizacao_id_fkey';
            columns: ['equipamento_id', 'organizacao_id'];
            isOneToOne: false;
            referencedRelation: 'equipamentos';
            referencedColumns: ['id', 'organizacao_id'];
          },
          {
            foreignKeyName: 'ordem_servico_equipamentos_ordem_id_organizacao_id_fkey';
            columns: ['ordem_id', 'organizacao_id'];
            isOneToOne: false;
            referencedRelation: 'ordens_servico';
            referencedColumns: ['id', 'organizacao_id'];
          },
        ];
      };
      ordem_servico_eventos: {
        Row: {
          criado_em: string;
          descricao: string | null;
          id: string;
          ordem_id: string;
          organizacao_id: string;
          status_anterior: Database['public']['Enums']['status_ordem'] | null;
          status_novo: Database['public']['Enums']['status_ordem'] | null;
          tipo: Database['public']['Enums']['tipo_evento_ordem'];
          usuario_id: string | null;
        };
        Insert: {
          criado_em?: string;
          descricao?: string | null;
          id?: string;
          ordem_id: string;
          organizacao_id: string;
          status_anterior?: Database['public']['Enums']['status_ordem'] | null;
          status_novo?: Database['public']['Enums']['status_ordem'] | null;
          tipo: Database['public']['Enums']['tipo_evento_ordem'];
          usuario_id?: string | null;
        };
        Update: {
          criado_em?: string;
          descricao?: string | null;
          id?: string;
          ordem_id?: string;
          organizacao_id?: string;
          status_anterior?: Database['public']['Enums']['status_ordem'] | null;
          status_novo?: Database['public']['Enums']['status_ordem'] | null;
          tipo?: Database['public']['Enums']['tipo_evento_ordem'];
          usuario_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ordem_servico_eventos_ordem_id_organizacao_id_fkey';
            columns: ['ordem_id', 'organizacao_id'];
            isOneToOne: false;
            referencedRelation: 'ordens_servico';
            referencedColumns: ['id', 'organizacao_id'];
          },
          {
            foreignKeyName: 'ordem_servico_eventos_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      ordens_servico: {
        Row: {
          aberta_por: string | null;
          agendada_para: string | null;
          atualizado_em: string;
          cliente_id: string;
          criado_em: string;
          id: string;
          local_id: string;
          numero: number;
          organizacao_id: string;
          prioridade: Database['public']['Enums']['prioridade_ordem'];
          problema: string;
          solicitante: string | null;
          status: Database['public']['Enums']['status_ordem'];
          tecnico_id: string | null;
          tipo_servico: Database['public']['Enums']['tipo_servico'];
        };
        Insert: {
          aberta_por?: string | null;
          agendada_para?: string | null;
          atualizado_em?: string;
          cliente_id: string;
          criado_em?: string;
          id?: string;
          local_id: string;
          numero: number;
          organizacao_id: string;
          prioridade?: Database['public']['Enums']['prioridade_ordem'];
          problema: string;
          solicitante?: string | null;
          status?: Database['public']['Enums']['status_ordem'];
          tecnico_id?: string | null;
          tipo_servico?: Database['public']['Enums']['tipo_servico'];
        };
        Update: {
          aberta_por?: string | null;
          agendada_para?: string | null;
          atualizado_em?: string;
          cliente_id?: string;
          criado_em?: string;
          id?: string;
          local_id?: string;
          numero?: number;
          organizacao_id?: string;
          prioridade?: Database['public']['Enums']['prioridade_ordem'];
          problema?: string;
          solicitante?: string | null;
          status?: Database['public']['Enums']['status_ordem'];
          tecnico_id?: string | null;
          tipo_servico?: Database['public']['Enums']['tipo_servico'];
        };
        Relationships: [
          {
            foreignKeyName: 'ordens_servico_aberta_por_fkey';
            columns: ['aberta_por'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ordens_servico_cliente_id_organizacao_id_fkey';
            columns: ['cliente_id', 'organizacao_id'];
            isOneToOne: false;
            referencedRelation: 'clientes';
            referencedColumns: ['id', 'organizacao_id'];
          },
          {
            foreignKeyName: 'ordens_servico_local_id_cliente_id_organizacao_id_fkey';
            columns: ['local_id', 'cliente_id', 'organizacao_id'];
            isOneToOne: false;
            referencedRelation: 'locais_atendimento';
            referencedColumns: ['id', 'cliente_id', 'organizacao_id'];
          },
          {
            foreignKeyName: 'ordens_servico_organizacao_id_fkey';
            columns: ['organizacao_id'];
            isOneToOne: false;
            referencedRelation: 'organizacoes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ordens_servico_organizacao_id_tecnico_id_fkey';
            columns: ['organizacao_id', 'tecnico_id'];
            isOneToOne: false;
            referencedRelation: 'organizacao_usuarios';
            referencedColumns: ['organizacao_id', 'usuario_id'];
          },
        ];
      };
      organizacao_usuarios: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          criado_em: string;
          id: string;
          organizacao_id: string;
          papeis: Database['public']['Enums']['papel_usuario'][];
          usuario_id: string;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          organizacao_id: string;
          papeis: Database['public']['Enums']['papel_usuario'][];
          usuario_id: string;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          organizacao_id?: string;
          papeis?: Database['public']['Enums']['papel_usuario'][];
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organizacao_usuarios_organizacao_id_fkey';
            columns: ['organizacao_id'];
            isOneToOne: false;
            referencedRelation: 'organizacoes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organizacao_usuarios_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      organizacoes: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          id: string;
          nome: string;
        };
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
      usuarios: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          email: string;
          id: string;
          nome: string;
        };
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          email: string;
          id: string;
          nome?: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          email?: string;
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      abrir_ordem_servico: {
        Args: {
          p_cliente_id: string;
          p_equipamento_ids: string[];
          p_local_id: string;
          p_organizacao_id: string;
          p_prioridade: Database['public']['Enums']['prioridade_ordem'];
          p_problema: string;
          p_solicitante: string;
          p_tipo_servico: Database['public']['Enums']['tipo_servico'];
        };
        Returns: string;
      };
      editar_ordem_servico: {
        Args: {
          p_cliente_id: string;
          p_equipamento_ids: string[];
          p_id: string;
          p_local_id: string;
          p_prioridade: Database['public']['Enums']['prioridade_ordem'];
          p_problema: string;
          p_solicitante: string;
          p_tipo_servico: Database['public']['Enums']['tipo_servico'];
        };
        Returns: undefined;
      };
    };
    Enums: {
      papel_usuario: 'admin' | 'gestor' | 'tecnico';
      prioridade_ordem: 'baixa' | 'media' | 'alta' | 'urgente';
      status_ordem: 'aberta' | 'agendada' | 'em_execucao' | 'pausada' | 'concluida' | 'cancelada';
      tipo_equipamento:
        | 'split'
        | 'janela'
        | 'cassete'
        | 'piso_teto'
        | 'multi_split'
        | 'vrf'
        | 'fancoil'
        | 'chiller'
        | 'self_contained'
        | 'camara_fria'
        | 'balcao_refrigerado'
        | 'outro';
      tipo_evento_ordem: 'abertura' | 'edicao' | 'mudanca_status' | 'atribuicao';
      tipo_pessoa: 'fisica' | 'juridica';
      tipo_servico: 'corretiva' | 'preventiva' | 'instalacao' | 'outro';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      papel_usuario: ['admin', 'gestor', 'tecnico'],
      prioridade_ordem: ['baixa', 'media', 'alta', 'urgente'],
      status_ordem: ['aberta', 'agendada', 'em_execucao', 'pausada', 'concluida', 'cancelada'],
      tipo_equipamento: [
        'split',
        'janela',
        'cassete',
        'piso_teto',
        'multi_split',
        'vrf',
        'fancoil',
        'chiller',
        'self_contained',
        'camara_fria',
        'balcao_refrigerado',
        'outro',
      ],
      tipo_evento_ordem: ['abertura', 'edicao', 'mudanca_status', 'atribuicao'],
      tipo_pessoa: ['fisica', 'juridica'],
      tipo_servico: ['corretiva', 'preventiva', 'instalacao', 'outro'],
    },
  },
} as const;
