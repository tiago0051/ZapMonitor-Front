import { NotFound } from "@/components/not-found";
import { PostEditor } from "@/pages/dashboard/posts/postEditor";
import { Posts } from "@/pages/dashboard/posts/posts";
import { Route, Routes } from "react-router";

const PostsRouter = () => {
  return (
    <Routes>
      <Route index element={<Posts />} />
      <Route path=":postId" element={<PostEditor />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default PostsRouter;
