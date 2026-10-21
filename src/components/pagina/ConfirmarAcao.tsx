import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type ConfirmarAcaoProps = {
  /** Botão que abre a confirmação. */
  gatilho: ReactNode;
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  aoConfirmar: () => void;
};

export function ConfirmarAcao({
  gatilho,
  titulo,
  descricao,
  rotuloConfirmar,
  aoConfirmar,
}: ConfirmarAcaoProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{gatilho}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={aoConfirmar}>{rotuloConfirmar}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
