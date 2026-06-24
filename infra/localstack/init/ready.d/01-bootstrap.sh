#!/bin/sh
set -eu

awslocal s3 mb s3://plus-alertas-test || true
awslocal sns create-topic --name alertas-estoque >/dev/null
QUEUE_URL="$(awslocal sqs create-queue --queue-name alertas-estoque-queue --query QueueUrl --output text)"
QUEUE_ARN="$(awslocal sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names QueueArn --query Attributes.QueueArn --output text)"
awslocal sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:000000000000:alertas-estoque \
  --protocol sqs \
  --notification-endpoint "$QUEUE_ARN" >/dev/null

echo "LocalStack bootstrap concluido para Alertas"
