import { DocumentForm } from '@/components/documents/DocumentForm';

export default function NewDocumentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">借入資料・稟議書の下書き生成</h1>
        <p className="text-sm text-slate-500">
          数字は同期済みCFから引用し、不足情報は要確認として残します。
        </p>
      </div>
      <DocumentForm />
    </div>
  );
}
