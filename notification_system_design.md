# Notification System Design

## Stage 1

The notification platform needs to support a few core actions — fetching notifications (all, unread, filtered by type), marking them as read, getting priority notifications, and deleting them. I've also designed a real-time mechanism using SSE.

### REST API Endpoints

#### Get all notifications

```
GET /api/notifications
```

Query params: `page`, `limit`, `notification_type`

Headers:
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "type": "Placement",
        "message": "CSX Corporation hiring",
        "isRead": false,
        "createdAt": "2026-04-22T17:51:30Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120
    }
  }
}
```

---

#### Get a single notification

```
GET /api/notifications/:id
```

Headers:
```json
{
  "Authorization": "Bearer <token>"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "type": "Placement",
    "message": "CSX Corporation hiring",
    "isRead": false,
    "createdAt": "2026-04-22T17:51:30Z"
  }
}
```

---

#### Mark a single notification as read

```
PATCH /api/notifications/:id/read
```

Headers:
```json
{
  "Authorization": "Bearer <token>"
}
```

Response:
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

#### Mark all notifications as read

```
PATCH /api/notifications/read-all
```

Headers:
```json
{
  "Authorization": "Bearer <token>"
}
```

Response:
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

#### Get priority notifications

```
GET /api/notifications/priority?n=10
```

Returns top n notifications ranked by type weight and recency.

Headers:
```json
{
  "Authorization": "Bearer <token>"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
        "type": "Placement",
        "message": "CSX Corporation hiring",
        "isRead": false,
        "priorityScore": 95.4,
        "createdAt": "2026-04-22T17:51:18Z"
      }
    ]
  }
}
```

---

#### Delete a notification

```
DELETE /api/notifications/:id
```

Headers:
```json
{
  "Authorization": "Bearer <token>"
}
```

Response:
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

### Real-time mechanism — Server-Sent Events (SSE)

I went with SSE instead of WebSockets because notifications only flow one way — server to client. WebSockets made sense to me only if students were also sending data back, which they're not here. SSE is simpler, works over plain HTTP, and browsers handle reconnection automatically which is nice.

```
GET /api/notifications/stream
```

Headers:
```json
{
  "Authorization": "Bearer <token>",
  "Accept": "text/event-stream",
  "Cache-Control": "no-cache"
}
```

The server pushes events in this format:
```
event: notification
data: {"id":"abc123","type":"Placement","message":"Google hiring","createdAt":"2026-04-22T18:00:00Z"}

event: ping
data: {"timestamp":"2026-04-22T18:00:30Z"}
```

A ping is sent every 30 seconds to keep the connection alive.

---

## Stage 2

### DB choice — PostgreSQL

I'd go with PostgreSQL here. The data is pretty structured — every notification has the same fields, and we already know the types (Placement, Event, Result) upfront. That makes a relational DB a natural choice. PostgreSQL also has native enum support which is handy, and it handles indexing and joins well which we'll need later.

I considered MongoDB briefly but honestly for this use case the schema is fixed enough that a relational DB just makes more sense and is easier to query.

### Schema

```sql
CREATE TYPE notification_type AS ENUM ('Placement', 'Event', 'Result');

CREATE TABLE students (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  email     VARCHAR(150) UNIQUE NOT NULL,
  rollNo    VARCHAR(50)  UNIQUE NOT NULL,
  createdAt TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE notifications (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  studentID         INTEGER          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notificationType  notification_type NOT NULL,
  message           TEXT             NOT NULL,
  isRead            BOOLEAN          DEFAULT FALSE,
  createdAt         TIMESTAMP        DEFAULT NOW()
);

-- indexes for the queries we'll run most often
CREATE INDEX idx_notifications_studentID      ON notifications(studentID);
CREATE INDEX idx_notifications_createdAt      ON notifications(createdAt DESC);
CREATE INDEX idx_notifications_type           ON notifications(notificationType);
CREATE INDEX idx_notifications_student_unread ON notifications(studentID, isRead) WHERE isRead = FALSE;
```

### Problems as data grows

The main issues I can see:
- The notifications table will get huge fast (50k students × many notifications each)
- Queries that filter by studentID and isRead will slow down without proper indexes
- If we're doing bulk inserts for all 50k students at once, the DB will get hammered
- Too many concurrent connections from students loading the app simultaneously

To handle this I'd look at partitioning the notifications table by month (so old data is in separate partitions and queries on recent data are faster), adding a connection pooler like pgBouncer, and using read replicas for GET queries so we're not hitting the primary DB for reads.

### Queries

**Get all notifications for a student (paginated)**
```sql
SELECT id, notificationType, message, isRead, createdAt
FROM notifications
WHERE studentID = $1
ORDER BY createdAt DESC
LIMIT $2 OFFSET $3;
```

**Get unread notifications**
```sql
SELECT id, notificationType, message, createdAt
FROM notifications
WHERE studentID = $1 AND isRead = FALSE
ORDER BY createdAt DESC;
```

**Mark one as read**
```sql
UPDATE notifications
SET isRead = TRUE
WHERE id = $1 AND studentID = $2;
```

**Mark all as read**
```sql
UPDATE notifications
SET isRead = TRUE
WHERE studentID = $1 AND isRead = FALSE;
```

**Filter by type**
```sql
SELECT id, message, isRead, createdAt
FROM notifications
WHERE studentID = $1 AND notificationType = $2
ORDER BY createdAt DESC
LIMIT $3 OFFSET $4;
```

---

## Stage 3

### Is the query accurate?

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

Logically it returns the right rows, but I'd change two things:

1. `SELECT *` is unnecessary — we only need a few columns, not everything. Selecting all columns wastes bandwidth especially when the table is large.
2. `ORDER BY createdAt ASC` returns oldest first. For a notification inbox I'd expect newest first (DESC) to be the right behaviour for users.

### Why is it slow?

At 5 million rows with no composite index covering both `studentID` and `isRead`, the database has to scan through the entire notifications table to find matching rows. It can't use a single-column index on studentID alone efficiently when it also needs to filter isRead. So it ends up reading way more rows than needed, then sorting them — which gets slow fast.

### What I'd change

```sql
-- partial composite index — only indexes unread rows, much smaller than a full index
CREATE INDEX idx_notifications_student_unread
ON notifications(studentID, createdAt DESC)
WHERE isRead = FALSE;

-- updated query
SELECT id, notificationType, message, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = FALSE
ORDER BY createdAt DESC;
```

Before the fix the DB was doing a full sequential scan — O(N) over 5M rows. After adding this index it can jump straight to the matching rows using the index — roughly O(log N) to find the position, then just fetching the K unread rows for that student. For a student with say 30 unread notifications out of 5M total, that's a massive improvement.

### Should we index every column?

No, that's bad advice. Every index takes up disk space and more importantly every INSERT, UPDATE, and DELETE has to update all indexes too. So if we're inserting notifications for 50k students, having indexes on every column makes those writes significantly slower. You only want indexes on columns you're actually filtering or sorting by in frequent queries.

### Students who got a Placement notification in the last 7 days

```sql
SELECT DISTINCT s.id, s.name, s.email
FROM students s
JOIN notifications n ON n.studentID = s.id
WHERE n.notificationType = 'Placement'
  AND n.createdAt >= NOW() - INTERVAL '7 days';
```

---

## Stage 4

### The problem

Every page load hitting the DB directly doesn't scale. With 50k students opening the app around placement season, that's potentially 50k simultaneous DB queries which will overwhelm the connection pool and cause timeouts for everyone.

### What I'd suggest

**Redis caching** is the main solution I'd go with. When a student loads their notifications, we check Redis first. If it's there (cache hit), we return it instantly without touching the DB. If not, we query the DB, return the result, and also store it in Redis with a TTL of maybe 60 seconds.

The tradeoff is that for up to 60 seconds a student might not see a brand new notification. That's acceptable for most notifications. For something critical we can just invalidate that student's cache key whenever a new notification is inserted for them.

**Pagination** is also important — instead of loading all notifications on page load, load 20 at a time. This makes each DB query much cheaper and the page loads faster too.

**Read replicas** would be my third suggestion if the load is really high. Route all SELECT queries to a replica and keep the primary DB only for writes. The downside is slight replication lag but for notifications that's fine.

I wouldn't do all three at once from day one — I'd start with pagination (easiest, no infra changes), then add Redis, then replicas only if really needed.

---

## Stage 5

### What's wrong with the current implementation

```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

A few problems:

1. It's a synchronous loop over 50k students. Even if each iteration takes 100ms, that's 83 minutes of the HR waiting. The request will almost certainly time out.
2. No error handling — if `send_email` throws an error at student 200, the whole loop dies and the remaining 49,800 students get nothing.
3. The 200 students whose emails failed are just gone — no record of the failure, no way to retry.
4. Doing 50k individual DB inserts one by one is very slow compared to a bulk insert.

### What about the 200 failed emails?

Without any failure tracking we have no idea who they are. We can't retry them. Those students just silently miss the notification. This is a real problem especially during placement season.

### Should DB insert and email happen together?

They shouldn't be in the same transaction — you can't really put an HTTP call to an email API inside a DB transaction, and if you tried and the email failed you'd roll back the DB record too which isn't what you want.

My approach: save to DB first (that's your source of truth), then trigger the email async. If email fails the DB record is still there and you can retry the email. The notification exists, we just need to deliver it.

### Redesigned version

```python
function notify_all(student_ids: array, message: string):
    job_id = generate_uuid()
    
    # bulk insert all notifications at once — much faster than one by one
    bulk_insert_notifications(student_ids, message, job_id, status="pending")
    
    # push to a queue and return immediately — HR doesn't wait
    queue.push({
        "job_id": job_id,
        "student_ids": student_ids,
        "message": message
    })
    
    return { "job_id": job_id, "status": "queued" }


# workers pick up batches from the queue and process in parallel
function process_batch(batch: array, message: string, job_id: string):
    for student_id in batch:
        try:
            send_email(student_id, message)
            push_to_app(student_id, message)
            update_status(job_id, student_id, status="sent")
        except EmailFailure:
            update_status(job_id, student_id, status="failed")
            # retry up to 3 times with some delay
            queue.push_retry(student_id, message, retries_left=3, delay=60s)


function retry_failed(student_id: string, message: string, retries_left: int):
    if retries_left == 0:
        log_permanent_failure(student_id)
        return
    
    try:
        send_email(student_id, message)
        update_status(student_id, status="sent")
    except:
        queue.push_retry(student_id, message, retries_left - 1, delay=120s)
```

This way the HR gets an instant response, notifications are bulk inserted in one go, parallel workers handle the actual sending, and failed emails are retried automatically. We also have a full audit trail of what succeeded and what failed.

---

## Stage 6

*Implementation is in `notification_app_be/src/priority.ts`*

### Approach

I compute a priority score for each notification based on two things — how important the type is, and how recent it is:

```
score = typeWeight + recencyScore

Placement = 100
Result    = 60  
Event     = 20

recencyScore = max(0, 50 - hoursSinceCreated)
```

So a Placement notification from 2 hours ago scores 148, while an Event from 60 hours ago scores just 20. This felt like a reasonable balance between type importance and recency.

To efficiently maintain the top 10 as new notifications come in, I use a min-heap of size 10. When a new notification arrives, if its score is higher than the minimum in the heap, it replaces it. This way we never sort the full list — each new notification is O(log 10) which is basically constant.