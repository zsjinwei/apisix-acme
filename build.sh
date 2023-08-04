image=apisix-acme:1.2.0

input=$1

case $input in
  build)
    yarn
    docker build --no-cache --rm --tag ${image} .
    ;;
  publish)
    img_dockerhub=zsjinwei/${image}
    docker tag ${image} ${img_dockerhub}
    docker push ${img_dockerhub}
    ;;
  *)
    echo "no input"
    ;;
esac
