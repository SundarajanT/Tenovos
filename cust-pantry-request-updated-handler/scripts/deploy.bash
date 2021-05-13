#!/bin/bash

display_usage() {
  echo "usage: $0 [stack-name] [environment]"
  echo "example: $0 [tenovos-event-listener] [integ]"
  echo "NOTE: this requires you to have AWS profiles set up that match the input for 'environment'"
}

backup_file() {
  if [[ -f "$pwdesc/template-backup.yaml" ]] 
  then
    cp "$pwdesc/template-backup.yaml" "$pwdesc/template.yaml" 
    rm -rf "$pwdesc/template-backup.yaml"
  fi;
  exit 1;
}

if [ $# -le 1 ]
then
  display_usage
  exit 1
fi

if [ $1 == '-h' ]
then
  display_usage
  exit 1
fi


STACK_NAME=$1
ENVIRONMENT=$2

pwdesc=$(echo "$PWD")

echo "$pwdesc"
cp "$pwdesc/template.yaml" "$pwdesc/template-backup.yaml"

source $pwdesc/scripts/$ENVIRONMENT.env.bash

trap backup_file EXIT ERR INT TERM;

if [[ -z $DEPLOYMENT_S3_BUCKET ]] 
then 
  read -p "Enter the cloudformation deployment bucket name:" DEPLOYMENT_S3_BUCKET
fi

DEPLOYMENT_S3_BUCKET=$(echo "$DEPLOYMENT_S3_BUCKET" | sed -e 's/\//\\\//g')

read -p "About to deploy $STACK_NAME to $ENVIRONMENT, continue (y/n)?" CHOICE
if [ "$CHOICE" = "y" ]; then
  echo "Continuing...";
else
  echo "Not continuing..."; exit 1;
fi

echo "Packaging..."
sam package --template-file template.yaml --output-template-file serverless-output.yml --s3-bucket $DEPLOYMENT_S3_BUCKET --profile $ENVIRONMENT

echo "Deploying..."
sam deploy --template-file serverless-output.yml --stack-name $STACK_NAME --profile $ENVIRONMENT --capabilities CAPABILITY_IAM --region us-east-1

backup_file;

echo "Done..."




