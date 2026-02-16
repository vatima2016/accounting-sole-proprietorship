import ImportWizard from '../components/import/ImportWizard';

export default function Import() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">CSV Import</h1>
      <ImportWizard />
    </div>
  );
}
