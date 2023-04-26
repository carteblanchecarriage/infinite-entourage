import { Test } from '@/utils/testImage';

export default function handler(req, res) {
  const { method, body } = req;
  console.log(body);
  const data = Test.oldMan;
  setTimeout(() => {
    res.status(200).json(data);
  }, 2000);
}
