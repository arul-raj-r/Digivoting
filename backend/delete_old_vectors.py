import os
import sys
import time
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from ai_assistant.services.pinecone_service import PineconeService

def run_targeted_deletion():
    ps = PineconeService()
    idx = ps.get_index()
    namespace = 'digivote-docs'
    target_old_doc = 'DigiVote_Comprehensive_System_Guide.pdf'
    target_new_doc = 'DigiVote_Comprehensive_Website_User_Guide.pdf'

    print("=" * 60)
    print("STEP 1: INSPECTION BEFORE DELETION")
    print("=" * 60)

    # 1. Inspect namespace vectors before deletion
    all_ids = []
    for page in idx.list(namespace=namespace):
        all_ids.extend([item.id if hasattr(item, 'id') else item for item in page])

    res = idx.fetch(ids=all_ids, namespace=namespace)
    vectors_dict = res.vectors if hasattr(res, 'vectors') else res.get('vectors', {})

    old_ids = []
    new_ids = []
    other_sources = {}

    for vid, vdata in vectors_dict.items():
        meta = vdata.metadata if hasattr(vdata, 'metadata') else vdata.get('metadata', {})
        src = meta.get('source')
        if src == target_old_doc:
            old_ids.append(vid)
        elif src == target_new_doc:
            new_ids.append(vid)
        else:
            other_sources[src] = other_sources.get(src, 0) + 1

    print(f"Index: {ps.index_name}")
    print(f"Namespace: {namespace}")
    print(f"Total vectors found in '{namespace}': {len(all_ids)}")
    print(f"Vectors matching '{target_old_doc}': {len(old_ids)}")
    print(f"Vectors matching '{target_new_doc}': {len(new_ids)}")
    if other_sources:
        print(f"Other source documents: {other_sources}")
    print("-" * 60)

    # 2. Perform deletion using metadata filter matching exactly: source == "DigiVote_Comprehensive_System_Guide.pdf"
    print("STEP 2: DELETING OLD DOCUMENT VECTORS VIA METADATA FILTER")
    print(f"Filter: {{'source': '{target_old_doc}'}}")
    print("=" * 60)

    filter_criteria = {"source": target_old_doc}
    try:
        ps.delete_vectors(filter_criteria=filter_criteria, namespace=namespace)
        print("Pinecone delete request with metadata filter succeeded.")
    except Exception as e:
        print(f"Filter delete error: {e}")
        # Fallback to delete with $eq filter syntax if needed
        try:
            ps.delete_vectors(filter_criteria={"source": {"$eq": target_old_doc}}, namespace=namespace)
            print("Pinecone delete request with $eq filter succeeded.")
        except Exception as e2:
            print(f"Alternative filter delete error: {e2}")
            # If serverless index does not support delete by metadata filter directly, delete by matched IDs
            print(f"Executing deletion by IDs ({len(old_ids)} vectors)...")
            ps.delete_vectors(ids=old_ids, namespace=namespace)
            print(f"Deleted {len(old_ids)} vectors by exact IDs.")

    # 3. Allow time for index consistency
    print("\nWaiting 6 seconds for Pinecone index consistency...")
    time.sleep(6)

    # 4. Post-deletion inspection & verification
    print("=" * 60)
    print("STEP 3: POST-DELETION VERIFICATION")
    print("=" * 60)

    remaining_ids = []
    for page in idx.list(namespace=namespace):
        remaining_ids.extend([item.id if hasattr(item, 'id') else item for item in page])

    res_post = idx.fetch(ids=remaining_ids, namespace=namespace)
    post_vectors = res_post.vectors if hasattr(res_post, 'vectors') else res_post.get('vectors', {})

    post_old = []
    post_new = []
    post_other = {}

    for vid, vdata in post_vectors.items():
        meta = vdata.metadata if hasattr(vdata, 'metadata') else vdata.get('metadata', {})
        src = meta.get('source')
        if src == target_old_doc:
            post_old.append(vid)
        elif src == target_new_doc:
            post_new.append(vid)
        else:
            post_other[src] = post_other.get(src, 0) + 1

    stats = idx.describe_index_stats()
    ns_stats = stats.namespaces if hasattr(stats, 'namespaces') else stats.get('namespaces', {})

    print(f"Total vectors remaining in namespace '{namespace}': {len(remaining_ids)}")
    print(f"Old vectors remaining ('{target_old_doc}'): {len(post_old)}")
    print(f"New vectors preserved ('{target_new_doc}'): {len(post_new)}")
    print(f"Namespace '{namespace}' stats: {ns_stats.get(namespace)}")
    print("=" * 60)

    if len(post_old) == 0 and len(post_new) == len(new_ids):
        print("VERIFICATION SUCCESS: Old vectors completely removed. New vectors 100% preserved.")
    else:
        print("VERIFICATION WARNING: Check remaining counts above.")

if __name__ == '__main__':
    run_targeted_deletion()
