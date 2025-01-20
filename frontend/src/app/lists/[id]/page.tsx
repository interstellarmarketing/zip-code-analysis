import { ListDetails } from './ListDetails';
import { Suspense } from 'react';

export default async function ListPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params;
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ListDetails listId={resolvedParams.id} />
    </Suspense>
  );
} 