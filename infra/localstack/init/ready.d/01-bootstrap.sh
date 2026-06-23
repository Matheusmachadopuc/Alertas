#!/bin/sh
set -eu

awslocal s3 mb s3://plus-alertas-test || true
awslocal sns create-topic --name alertas-estoque >/dev/null
awslocal sqs create-queue --queue-name alertas-estoque-queue >/dev/null

echo "LocalStack bootstrap concluido para Alertas"
