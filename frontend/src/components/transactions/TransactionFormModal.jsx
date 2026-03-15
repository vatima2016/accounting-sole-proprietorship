import Modal from '../common/Modal';
import TransactionForm from './TransactionForm';
import { api } from '../../services/api';

export default function TransactionFormModal({ isOpen, onClose, transaction, onSaved }) {
  const isEdit = !!transaction;

  const handleSave = async (data) => {
    let savedId;
    if (isEdit) {
      await api.updateTransaction(transaction.id, data);
      savedId = transaction.id;
    } else {
      const result = await api.createTransaction(data);
      savedId = result?.id;
    }
    onSaved(savedId);
  };

  const handleDelete = async (id) => {
    if (!confirm('Buchung wirklich löschen?')) return;
    await api.deleteTransaction(id);
    onSaved();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Buchung bearbeiten' : 'Neue Buchung'}>
      <TransactionForm
        transaction={transaction}
        onSave={handleSave}
        onDelete={isEdit ? handleDelete : null}
        onCancel={onClose}
      />
    </Modal>
  );
}
